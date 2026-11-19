// Provides npm / Node built-in modules to the bundled CommonJS source under Deno (Supabase Edge Runtime).
import express from 'npm:express@5.3.0';
import pg from 'npm:pg@8.23.1';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Buffer } from 'node:buffer';
import process from 'node:process';
// Older Deno versions (Supabase runs 2.1.x) do not expose these Node globals to non-npm code.
if (!globalThis.Buffer) globalThis.Buffer = Buffer;
if (!globalThis.process) globalThis.process = process;
globalThis.__lntExt = { express, pg, crypto, fs, path, readline };
