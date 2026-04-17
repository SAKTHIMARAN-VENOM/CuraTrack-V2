import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: string;
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function ensureDataDir() {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
    }
}

function readUsers(): User[] {
    ensureDataDir();
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
}

function writeUsers(users: User[]) {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function createUser(email: string, name: string, password: string): Promise<User> {
    const users = readUsers();

    // Check if email already exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser: User = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name,
        passwordHash,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);
    return newUser;
}

export async function verifyUser(email: string, password: string): Promise<User> {
    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        throw new Error('No account found with this email');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        throw new Error('Incorrect password');
    }

    return user;
}

export function findUserByEmail(email: string): User | undefined {
    const users = readUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}
