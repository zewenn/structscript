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
            replaces
        };
    }

    function as_text_type(str: string, as: text_types): text_type {
        return {
            value: str,
            type: as,
        };
    }

    export function remove_strings(from: string): text_type[] {
        const from_list = Array.from(from);
        let current: string_removal_object = {
            start_position: -1,
            distance: -1,
        };

        function reset() {
            current.start_position = -1;
            current.distance = -1;
        }

        function find_next() {
            for (const [index, value] of from_list.entries()) {
                if (!['"', "'"].includes(value)) continue;
                if (current.start_position == -1) {
                    current.start_position = index;
                    continue;
                }
                current.distance = index - current.start_position;
                break;
            }
        }

        const res: text_type[] = [];

        do {
            reset();
            find_next();
            if (current.start_position !== -1) {
                const code = from_list
                    .slice(0, current.start_position)
                    .join("");
                const string = from_list
                    .slice(
                        current.start_position,
                        current.start_position + current.distance + 1
                    )
                    .join("");
                res.push(as_text_type(code, text_types.code));
                res.push(as_text_type(string, text_types.string));

                from_list.splice(
                    0,
                    current.start_position + current.distance + 1
                );
            }
        } while (current.start_position !== -1);

        if (from_list.length !== 0) {
            res.push(as_text_type(from_list.join(""), text_types.code));
        }

        return res;
    }

    export function replace_token(
        list: text_type[],
        token: token
    ): text_type[] {
        const res: text_type[] = [];
        for (const value of list) {
            let value_copy = structuredClone(value);
            if (value_copy.type === text_types.code)
                value_copy.value = value_copy.value.replace(
                    token.token,
                    token.replaces
                );
            res.push(value_copy);
        }
        return res;
    }

    export function stringify_text_type_list(list: text_type[]): string {
        let res = "";
        for (const value of list) {
            res += value.value;
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
    const original = `
    pub fn main() -> void {
        const obj = {
            x: "asd"
        }
        print("hello world fn!");
        print(obj->x);
    }

    main();
    `;

    const no_strings = txtman.remove_strings(original);
    const replaced_fn = txtman
        .tokenise_list(no_strings)
        .token(txtman.as_token("fn ", "function "))
        .token(txtman.as_token("pub ", "export "))
        .token(txtman.as_token("print(", "console.log("))
        .token(txtman.as_token(") -> ", "): "))
        .token(txtman.as_token("->", "."))
        .close();
        
    await $`echo "${replaced_fn}" > ./test.ts && bun run test.ts`;
}

main();
