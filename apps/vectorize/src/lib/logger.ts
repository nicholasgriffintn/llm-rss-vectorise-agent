export class logger {
  static log(message: string, metadata?: any) {
    console.log(message, metadata);
  }
  static error(message: string, metadata?: any) {
    console.error(message, metadata);
  }
}
