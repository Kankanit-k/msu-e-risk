import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { email, name, staffId, staffName, staffSurname } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        staffId,
        staffName,
        staffSurname,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

app.get('/api/posts', async (req, res) => {
  const posts = await prisma.post.findMany({
    include: { author: true },
  });
  res.json(posts);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
