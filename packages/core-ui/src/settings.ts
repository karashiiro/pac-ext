export interface ExtensionSettings {
  getPAT(): Promise<string | undefined>;
  setPAT(pat: string): Promise<void>;
}
