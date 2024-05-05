import { $ } from "bun";

namespace txtman {
    enum text_types {
        string = "string",
        code = "code",
    }

    interface string_removal_object {
        start_position: number;
        distance: number;
    }

    interface text_type {
        value: string;
        type: text_types;
    }

    interface token {
        token: string;
        replaces: string;
    }

    export function as_token(token: string, replaces: string): token {
        return {
            token,
            replaces,
        };
    }

    function as_text_type(str: string, as: text_types): text_type {
        return {
            value: str,
            type: as,
        };
    }

    function split_return(str: string, chr: string): string[] {
        const ls = str.split(chr);
        const res: string[] = [];
        for (const [i, v] of ls.entries()) {
            if (i === ls.length - 1) {
                res.push(v);
                break;
            }
            res.push(v);
            res.push(chr);
        }
        return res;
    }

    export function process_text(from: string): text_type[] {
        from += "'@structscript-ignore'";
        const from_list = Array.from(from);
        let current_string: string_removal_object = {
            start_position: -1,
            distance: -1,
        };

        function reset() {
            current_string.start_position = -1;
            current_string.distance = -1;
        }

        function find_next() {
            for (const [index, value] of from_list.entries()) {
                if (!['"', "'"].includes(value)) continue;
                if (current_string.start_position == -1) {
                    current_string.start_position = index;
                    continue;
                }
                current_string.distance = index - current_string.start_position;
                break;
            }
        }

        const res: text_type[] = [];

        let is_next_struct = false;
        let is_struct = false;
        let struct_constructor = "constructor() {";

        do {
            reset();
            find_next();
            if (current_string.start_position !== -1) {
                const code_no_space: string[] = from_list
                    .slice(0, current_string.start_position)
                    .join("")
                    .split(" ");
                // console.log(code_no_space, current_string);

                const code: string[] = [];

                for (const [index, value] of code_no_space.entries()) {
                    if (value.includes("(")) {
                        code.push(...split_return(value, "("));
                        continue;
                    }
                    if (value.includes(")")) {
                        code.push(...split_return(value, ")"));
                        continue;
                    }
                    code.push(value);
                }

                const string = from_list
                    .slice(
                        current_string.start_position,
                        current_string.start_position +
                            current_string.distance +
                            1,
                    )
                    .join("");
                for (const code_part of code) {
                    // if (code_part === "struct") is_next_struct = true;
                    // if (code_part.split("\n").includes("{") && is_next_struct) {
                    //     is_struct = true;
                    //     is_next_struct = false;
                    // }
                    // if (code_part.split("\n").includes("}") && is_struct)
                    //     is_struct = false;

                    // console.log({ code_part, is_struct, is_next_struct });

                    res.push(as_text_type(code_part, text_types.code));
                    // if (!is_struct || code_part.split("\n").includes("{")) {
                    //     continue;
                    // }
                }
                if (!string.includes("@structscript-ignore"))
                    res.push(as_text_type(string, text_types.string));

                from_list.splice(
                    0,
                    current_string.start_position + current_string.distance + 1,
                );
            }
        } while (current_string.start_position !== -1);

        if (from_list.length !== 0) {
            res.push(as_text_type(from_list.join(""), text_types.code));
        }

        return res;
    }

    export function replace_token(
        list: text_type[],
        token: token,
    ): text_type[] {
        const res: text_type[] = [];
        for (const value of list) {
            let value_copy = structuredClone(value);
            if (
                value_copy.type === text_types.code &&
                value_copy.value === token.token
            )
                value_copy.value = value_copy.value.replace(
                    token.token,
                    token.replaces,
                );
            res.push(value_copy);
        }
        return res;
    }

    export function stringify_text_type_list(list: text_type[]): string {
        let res = "";
        for (const value of list) {
            res += value.value + " ";
        }
        return res;
    }

    export function tokenise_list(list: text_type[]) {
        function rplc_tkn(tkn: token) {
            list = replace_token(list, tkn);
            return {
                token: rplc_tkn,
                close: () => stringify_text_type_list(list),
            };
        }

        return { token: rplc_tkn, end: () => stringify_text_type_list(list) };
    }
}

async function main() {
    const now = Date.now();
    const original = `
    struct test {
        x: string
    }

    struct test2 :: test {
        y: number
    }

    pub fn main() -> void {
        const obj: test2 = {
            x: "asd",
            y: 2
        }

        const clone = &(obj);

        obj.y = 10;

        print("hello world fn!");

        print(obj, clone);
    }

    main();
    `;

    const no_strings = txtman.process_text(original);
    // console.log(no_strings);

    const tokenised_list = txtman.tokenise_list(no_strings);
    const replaced_fn = tokenised_list
        .token(txtman.as_token("fn", "function"))
        .token(txtman.as_token("pub", "export"))
        .token(txtman.as_token("print", "console.log"))
        .token(txtman.as_token("&", "structuredClone"))
        .token(txtman.as_token("->", ":"))
        .token(txtman.as_token("::", "extends"))
        .token(txtman.as_token("struct", "interface"))
        .close();

    console.log(`StrucTScript [${Date.now() - now}s]`);
    await $`echo "${replaced_fn}" > ./test.ts && bun x prettier test.ts --write && bun test.ts`;
}

main();
