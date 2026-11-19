// Provides npm / Node built-in modules to the bundled CommonJS source under Deno (Supabase Edge Runtime).
import express from 'npm:express@5.3.0';
import pg from 'npm:pg@8.23.1';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
globalThis.__lntExt = { express, pg, crypto, fs, path, readline };
