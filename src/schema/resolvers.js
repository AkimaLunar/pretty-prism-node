import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY } from '../config';
import { assertValidUser, assertValidPolishId } from './assertions';
import { logger } from '../lib/logger';

const hashPassword = password => bcrypt.hash(password, 10);
const validatePassword = (input, password) => bcrypt.compare(input, password);
const generateToken = user =>
  // TODO: Refactor to use just the ID
  jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256'
  });

export default {
  Query: {
    allPolishes: async (root, data, { mongo: { Polishes } }) =>
      await Polishes.find({}).toArray(),

    allUsers: async (root, data, { mongo: { Users } }) =>
      await Users.find({}).toArray(),

    polish: async (root, data, { mongo: { Polishes } }) =>
      await Polishes.findOne({ _id: new ObjectId(data.id) }),

    messages: async (root, data, { mongo: { Messages } }) =>
      await Messages.find({ receiver: data.receiverId }).toArray(),

    chat: async (root, data, { mongo: { Messages } }) =>
      await Messages.find({
        $or: [
          {
            receiver: data.receiverId,
            sender: new ObjectId(data.senderId)
          },
          {
            receiver: data.senderId,
            sender: new ObjectId(data.receiverId)
          }
        ]
      }).toArray()
  },

  Mutation: {
    createPolish: async (root, data, { mongo: { Polishes }, user }) => {
      assertValidUser(user);
      const newPolish = Object.assign({ ownersIds: [user && user._id] }, data);
      const response = await Polishes.insert(newPolish);
      return Object.assign({ id: response.insertedIds[0] }, newPolish);
    },

    createUser: async (root, data, { mongo: { Users } }) => {
      const _hash = await hashPassword(data.password);
      const newUser = Object.assign({}, data, {
        password: _hash,
        avatar:
          'https://pretty-prism.nyc3.digitaloceanspaces.com/assets/default_avatar.png'
      });
      const response = await Users.insert(newUser);
      return Object.assign({ id: response.insertedIds[0] }, newUser);
    },

    login: async (root, data, { mongo: { Users } }) => {
      const user = await Users.findOne({ username: data.username });
      const _validPassword = await validatePassword(
        data.password,
        user.password
      );
      if (_validPassword) {
        return {
          token: generateToken(user)
        };
      }
    },

    createComment: async (
      root,
      data,
      { mongo: { Comments, Polishes }, user }
    ) => {
      assertValidPolishId(new ObjectId(data.polish), Polishes);
      assertValidUser(user);
      const newComment = Object.assign({}, data, {
        timestamp: Date.now(),
        author: user._id
      });
      const response = await Comments.insert(newComment);
      return Object.assign({ id: response.insertedIds[0] }, newComment);
    },

    createMessage: async (root, data, { mongo: { Messages }, user }) => {
      assertValidUser(user);
      const newMessage = Object.assign({}, data, {
        timestamp: Date.now(),
        sender: user._id
      });
      const response = await Messages.insert(newMessage);
      return Object.assign({ id: response.insertedIds[0] }, newMessage);
    }
  },

  Polish: {
    id: root => root._id || root.id,
    owners: async ({ ownersIds }, data, { mongo: { Users } }) =>
      await ownersIds.map(id => Users.findOne({ _id: new ObjectId(id) })),
    comments: async ({ _id }, data, { mongo: { Comments } }) =>
      await Comments.find({ polishId: _id.toString }).toArray()
  },
  User: {
    id: root => root._id || root.id
  },
  Comment: {
    id: root => root._id || root.id,
    author: async ({ author }, data, { mongo: { Users } }) =>
      await Users.findOne({ _id: author })
  },
  Message: {
    id: root => root._id || root.id,
    sender: async ({ sender }, data, { mongo: { Users } }) =>
      await Users.findOne({ _id: sender }),
    receiver: async ({ receiver }, data, { mongo: { Users } }) =>
      await Users.findOne({ _id: new ObjectId(receiver) })
  }
};
