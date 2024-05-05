interface test {
    x: string;
}

interface test2 extends test {
    y: number;
}

export function main(): void {
    const obj: test2 = {
        x: "asd",
        y: 2,
    };

    const clone = structuredClone(obj);

    obj.y = 10;

    console.log("hello world fn!");

    console.log(obj, clone);
}

main();
