import { recoverMessageAddress } from "viem";

export async function verifyRawDigestSignature(
  wallet: string,
  digest: `0x${string}`,
  signature: `0x${string}`,
): Promise<boolean> {
  const recovered = await recoverMessageAddress({
    message: { raw: digest },
    signature,
  });
  return recovered.toLowerCase() === wallet.toLowerCase();
}
