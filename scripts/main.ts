import { AtlasEnvironment } from "atlas-ide";
import * as deployPaymaster from "./deploy-paymaster";
import * as usePaymaster from "./use-paymaster";

export async function main(atlas: AtlasEnvironment) {
    const {
        privateKey,
        erc20Address,
        paymasterAddress
    } = await deployPaymaster.main(atlas);
    await usePaymaster.main(
        atlas,
        paymasterAddress,
        erc20Address,
        privateKey
    )
}
