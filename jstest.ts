async function wait(ms: number) {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    })

}

async function a() {
    wait(100);
    return 1;
}

async function b() {
    return 2;
}

(async function () {
    const x = [a, b];

    for (const func of x) {
        let y = await func();
        console.log(y);
    }
})();
