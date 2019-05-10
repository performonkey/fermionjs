export default function delay(time: number): Promise<{}> {
  return new Promise(resolve => setTimeout(resolve, time));
}