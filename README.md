# Olin.link

### A URL shortener for the Olin Community

## Environment Variable Management

[dotenv][dotenv] is used to manage environment variables during development and in production. This involves putting all the environment variables in a file called `.env` (see [`.env.example`](.env.example)), which is loaded by the app at runtime. The `.env` file is gitignored for security.

## Building

The project is compiled exclusively with `tsc`, which compiles every `.ts` file in `src/**/*` to a corresponding file in `dist/`. Just run `tsc` to compile the entire project (or run `npm run build`, which does the same thing).

To clean the project, simply delete the `dist/` folder and everything in it (or run `npm run clean`).

To have the compiler watch for and re-compile any changes, run `tsc --watch` or `npm run watch`.

## Running

To run the bot, build as described above then run `node ./dist/index.js` or `npm run start` (which will build for you).

You can also run and debug from within VS Code, which will work properly with the VS Code debugger use the `Run` task (not the `Watch` task, which is buggy).

In development, you can run `npm run dev`, which will clean the project, build, and run the bot. It will also watch changes, and subsequently recompile the project and reboot the bot.

## License

Olin.link licensed under the MIT License:

Copyright © 2020 Ari Porad <aporad@olin.edu>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[dotenv]: https://github.com/motdotla/dotenv
