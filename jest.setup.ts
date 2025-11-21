import { buildAllTact } from '@ton/blueprint';
import "@ton/test-utils";

export default async function () {
    await buildAllTact();
}
