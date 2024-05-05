

/**
 * struct test {
 *      x?: number = 0;
 *      y?: number = 0;
 * }
 */

interface test {
    x: string
}

class test2 implements test {
    public x: string
    constructor() {
        this.x = ""
    }
}