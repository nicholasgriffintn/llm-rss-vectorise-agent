export class logger {
  static log(message: string, metadata?: any) {
    console.log(message);
    if (metadata) {
      console.log(metadata);
    }
  }
}
