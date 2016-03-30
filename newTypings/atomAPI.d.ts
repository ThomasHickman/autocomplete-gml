declare module "atom" {
    interface ErrorCallback{
        error: Object;
        handle: () => void;
    }

    class Directory{

    }

    export class File{
        constructor(filePath: string, symlink: boolean);
        create(): Promise<boolean>;

        onDidChange(callback: () => any): AtomCore.Disposable;
        onDidRename(callback: () => any): AtomCore.Disposable;
        onDidDelete(callback: () => any): AtomCore.Disposable;
        onWillThrowWatchError(callback: (errorObject: ErrorCallback) => any): AtomCore.Disposable;

        isFile(): boolean;
        isDirectory(): boolean;
        isSymbolicLink(): boolean;
        exists(): Promise<boolean>;
        existsSync(): boolean;
        getDigest(): Promise<string>;
        getDigestSync(): string;
        setEncoding(encoding: string): void;
        getEncoding(): string;

        getPath(): string;
        getRealPathSync(): string;
        getRealPath(): Promise<string>;
        getBaseName(): string;

        getParent(): Directory;

        read(flushCache: boolean): Promise<string>;
        write(text: string): Promise<void>;
        writeSync(text: string): void;
    }
}
