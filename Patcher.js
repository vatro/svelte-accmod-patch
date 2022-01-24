/** @author Vatroslav Vrbanic <https://github.com/vatro> */

import * as fs from 'fs-extra';
import { join } from 'path';
import readline from 'readline';
import { readFile } from 'fs/promises';
import stripJsonComments from 'strip-json-comments';
import { exec } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import rimraf from 'rimraf';

export default class Patcher {
  constructor() {
    const cli_args_sliced = process.argv.slice(2);

    // the directory e.g. `npx sveltekit-accmod-patch` was executed from is considered to be the 'project root'
    const project_root_abs = process.cwd();

    const pkj_file_path_abs = join(project_root_abs, 'package.json');
    const pkj_svelte_path = join(project_root_abs, 'node_modules/svelte/package.json');

    const svelte_accmod_path = join(project_root_abs, 'node_modules/svelte-accmod/');

    const svelte_path = join(project_root_abs, 'node_modules/svelte/');

    // see https://github.com/sindresorhus/ora#readme
    let spinner = ora();
    const pfx_apply = 'svelte-accmod-patch (apply) >';
    const pfx_revert = 'svelte-accmod-patch (revert) >';

    this.init = async () => {
      clear_terminal();

      if (cli_args_sliced.length === 1 && cli_args_sliced.indexOf('-apply') === 0) {
        on_apply();
      } else if (cli_args_sliced.length === 0) {
        on_apply();
      } else if (cli_args_sliced.length === 1 && cli_args_sliced.indexOf('-revert') === 0) {
        on_revert();
      }
    };

    // see https://gist.github.com/timneutkens/f2933558b8739bbf09104fb27c5c9664
    function clear_terminal() {
      const blank = '\n'.repeat(process.stdout.rows);
      console.log(blank);
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
    }

    async function on_apply() {
      // get installed svelte version from projects' package.json
      console.log(`${pfx_apply} replacing original 'svelte' files with corresponding 'svelte-accmod' files ...`);
      const svelte_version = await get_installed_svelte_version();

      await install_svelte_accmod(svelte_version);
      replace_files();
    }

    async function get_installed_svelte_version() {

      const pkj = await readFile(pkj_svelte_path, 'utf8');
      const pkj_content = JSON.parse(stripJsonComments(pkj));

      const svelte_version = pkj_content.version;

      console.log(`ℹ️ detected svelte version: ${svelte_version} ...`);
      return svelte_version;
    }

    // yeah, I know :/ ...
    function get_fixed_version(svelte_version) {
        switch (svelte_version) {
          case '3.44.2': return '3.44.2-1'
          default: return svelte_version
        }
    }

    async function install_svelte_accmod(svelte_version) {
      const options = { spinner: 'dots' };

      const comparator_operator = ''
      const accmod_version = get_fixed_version(svelte_version)

      spinner = ora(options);
      spinner.start(`installing svelte-accmod@${comparator_operator}${accmod_version} ...`);

      await new Promise((resolve, reject) => {
        exec(`npm i svelte-accmod@${comparator_operator}${accmod_version} --save-dev`, (err, stdout, stderr) => {
          if (err) {
            spinner.fail(chalk.red(`oops! ABORT: svelte-accmod@${comparator_operator}${accmod_version} not available!`));
            process.exit();
          }
          spinner.succeed(`installed svelte-accmod@${comparator_operator}${accmod_version} ...`);
          resolve();
        });
      });
    }

    async function on_revert() {
      console.log(`${pfx_revert} deleting patched 'svelte' from 'node_modules' and reinstalling original 'svelte' ...`);

      await delete_patched_svelte();
      await reinstall_original_svelte();
      spinner.stop();
      spinner.succeed(chalk.green(`DONE! 👍 You're now using original 'svelte' again!`));
    }

    async function delete_patched_svelte() {
      const options = {
        text: `${pfx_revert} deleting patched 'svelte' ...`,
        spinner: 'dots',
      };

      spinner = ora(options);
      spinner.start();

      await new Promise((resolve, reject) =>
        rimraf(svelte_path, (err) => {
          if (err) {
            spinner.fail(
              chalk.red(`${pfx_revert} oops! 😬 something went wrong while trying to delete patched 'svelte'!`)
            );
            console.log(err);
            process.exit();
          }
          spinner.succeed(`patched 'svelte' deleted!`);
          return resolve();
        })
      );
    }

    async function reinstall_original_svelte() {
      const options = { spinner: 'dots' };

      spinner = ora(options);
      spinner.start(`${pfx_revert} re-installing original 'svelte' ...`);

      await new Promise((resolve, reject) => {
        exec(`npm install`, (err, stdout, stderr) => {
          if (err) {
            spinner.fail(
              chalk.red(`${pfx_revert} oops! 😬 something went wrong while trying to re-install original 'svelte'!`)
            );
            process.exit();
          }
          spinner.succeed(`re-installed original 'svelte'!`);
          resolve();
        });
      });
    }

    // --- replacing files ---

    const icon_file = '➜ 📄';
    const icon_folder = '➜ 📁';

    const files_and_folders = [
      { content: 'compiler.mjs', icon: icon_file },
      { content: 'compiler.js.map', icon: icon_file },
      { content: 'compiler.mjs.map', icon: icon_file },
      { content: 'compiler.js', icon: icon_file },
      { content: 'ssr.js', icon: icon_file },
      { content: 'ssr.mjs', icon: icon_file },
      { content: 'index.js', icon: icon_file },
      { content: 'index.mjs', icon: icon_file },
      { content: 'compiler.d.ts', icon: icon_file },
      { content: 'animate', icon: icon_folder },
      { content: 'easing', icon: icon_folder },
      { content: 'internal', icon: icon_folder },
      { content: 'motion', icon: icon_folder },
      { content: 'store', icon: icon_folder },
      { content: 'transition', icon: icon_folder },
      { content: 'types', icon: icon_folder },
    ];

    let replaced = 0;

    function replace_files() {
      console.log(`replacing files ...`);

      for (let i = 0; i < files_and_folders.length; i++) {
        fs.copy(
          svelte_accmod_path + files_and_folders[i].content,
          svelte_path + files_and_folders[i].content,
          (err) => {
            if (err) return console.error(err);
            console.log(`${files_and_folders[i].icon} ${files_and_folders[i].content}`);
            replaced++;
            check_replaced();
          }
        );
      }
    }

    function check_replaced() {
      if (replaced === files_and_folders.length) {
        spinner.succeed(`finished replacing original 'svelte' files with corresponding 'svelte-accmod' files!`);
        on_replaced();
      }
    }

    async function on_replaced() {
      await uninstall_svelte_accmod();
      on_finished();
    }

    async function uninstall_svelte_accmod() {
      const options = {
        text: `uninstalling 'svelte-accmod' ...`,
        spinner: 'dots',
      };

      spinner = ora(options);
      spinner.start();

      await new Promise((resolve, reject) => {
        exec('npm uninstall svelte-accmod --save-dev', (err, stdout, stderr) => {
          if (err) {
            spinner.fail(
              chalk.red(`${pfx_apply} oops! 😬 something went wrong while trying to uninstall 'svelte-accmod'!`)
            );
            console.log(err);
            process.exit();
          }
          spinner.succeed(`'svelte-accmod' uninstalled!`);
          return resolve();
        });
      });
    }

    function on_finished() {
      spinner.succeed(chalk.green(`🚀 DONE! You're now using 'svelte-accmod'!`));
    }
  }
}
