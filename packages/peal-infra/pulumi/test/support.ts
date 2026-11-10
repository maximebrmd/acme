import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";

const decodeInputs = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Unknown)
);

/** A resource the mocks saw made: its type, name and inputs. */
export interface Made {
  readonly inputs: unknown;
  readonly name: string;
  readonly type: string;
}

/** One input of a resource the mocks saw made, decoded as `schema` says. */
export const input = <A>(
  made: Made | undefined,
  key: string,
  schema: Schema.Codec<A, unknown>
): A =>
  Schema.decodeUnknownSync(schema)(
    made === undefined ? undefined : decodeInputs(made.inputs)[key]
  );

/**
 * Runs the programs against Pulumi's mocks, which record each resource
 * instead of calling Cloudflare, and give every resource an id of its name.
 */
export const recordResources = async (): Promise<Made[]> => {
  const made: Made[] = [];
  await pulumi.runtime.setMocks(
    {
      // The tunnel's token, from getZeroTrustTunnelCloudflaredToken.
      call: () => ({ token: "tunnel-token" }),
      newResource: (resource) => {
        const inputs: unknown = resource.inputs;
        made.push({ inputs, name: resource.name, type: resource.type });

        return {
          id: `${resource.name}-id`,
          state: {
            ...decodeInputs(inputs),
            aud: `${resource.name}-aud`,
            value: `${resource.name}-value`,
          },
        };
      },
    },
    "peal",
    "test",
    true
  );

  return made;
};

/** An output's value, once the mocks have resolved it. */
export const valueOf = async <A>(output: pulumi.Output<A>): Promise<A> => {
  const { promise, resolve } = Promise.withResolvers<A>();
  output.apply((value) => {
    resolve(value);

    return value;
  });

  return await promise;
};
