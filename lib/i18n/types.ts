import type { itMessages } from "@/lib/i18n/messages/it";

export type Messages = typeof itMessages;
export type MessageKey = FlattenKeys<Messages>;

type FlattenKeys<T, Prefix extends string = ""> = T extends string
  ? Prefix extends ""
    ? never
    : Prefix
  : {
      [K in keyof T & string]: FlattenKeys<
        T[K],
        Prefix extends "" ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string];

export type TranslateParams = Record<string, string | number>;
