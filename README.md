# reread

English | [中文](/README.zh.md)

reread is a local-first EPUB reader. It is meant to be a lightweight reading tool for books you already keep on your own machine: open the page, read your files directly, and avoid cloud accounts or re-uploading your library to another service.

## When you might use it

reread may fit your workflow if:

- your ebooks already live on your local drive and you want to read them in the browser
- you want the browser to access a folder you choose with File System Access API
- you do not want to depend on an online bookstore or sync service
- you want to reopen the page and continue from where you left off
- you want your library, covers, reading progress, and reading settings to live in one simple local app

## What it can do

- open local EPUB files directly
- access a user-selected local folder with File System Access API
- remember books you have opened before
- save reading progress and reading settings
- manage a local library through shelf
- restore reading position in an EPUB-friendly way

## Current features

- local folder selection and library browsing
- EPUB cover previews and book metadata caching
- reader page and table of contents navigation
- reading progress save and restore
- font size, line height, paragraph spacing, and theme settings
- local book indexing

## Tech overview

- Next.js App Router
- File System Access API
- IndexedDB for book metadata and reading progress
- foliate-js for EPUB parsing and rendering
- zip.js for reading EPUB files, which are ZIP archives

## Development

```bash
pnpm dev
```

Then open `http://localhost:3000`.

## Build

```bash
pnpm build
```
