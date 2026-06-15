// auth.js - User Session & Auth controller for WildGuard Web
import { getUser, saveUser } from './db.js';

let activeUser = null;

export function getActiveUser() {
    if (!activeUser) {
        const cached = localStorage.getItem('wildguard_active_user');
        if (cached) {
            activeUser = JSON.parse(cached);
        }
    }
    return activeUser;
}

export function saveSession(user) {
    activeUser = user;
    localStorage.setItem('wildguard_active_user', JSON.stringify(user));
}

export function clearSession() {
    activeUser = null;
    localStorage.removeItem('wildguard_active_user');
}

export async function login(email, password) {
    const user = await getUser(email);
    if (!user) {
        throw new Error('User not registered on this node.');
    }
    if (user.passwordHash !== password) {
        throw new Error('Invalid node credentials.');
    }
    saveSession(user);
    return user;
}

export async function register(email, password, fullName, role = 'user') {
    const existing = await getUser(email);
    if (existing) {
        throw new Error('Email already registered on this node.');
    }
    const newUser = { email, passwordHash: password, fullName, role };
    await saveUser(newUser);
    saveSession(newUser);
    return newUser;
}

export function loginAsGuest() {
    const guestUser = {
        email: 'guest@wildguard.ai',
        fullName: 'Guest Explorer',
        role: 'user',
        isGuest: true
    };
    saveSession(guestUser);
    return guestUser;
}

export async function forgotPassword(email) {
    const user = await getUser(email);
    if (!user) {
        throw new Error('Email not found on this node.');
    }
    // Return mock offline bypass key
    return 'OFFLINE_BYPASS_999';
}
