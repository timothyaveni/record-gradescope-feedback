import { OBSWebSocket } from 'obs-websocket-js';

const obs = new OBSWebSocket();

await obs.connect('ws://localhost:4455', 'fluxtapose');

await obs.call('SetProfileParameter', {
  parameterCategory: 'Output',
  parameterName: 'FilenameFormatting',
  parameterValue: 'gradescope_submission_1234',
});

// const videoSettings = await obs.call('GetProfileParameter', {
//   parameterCategory: 'Output',
//   parameterName: 'FilenameFormatting',
// });
// this returns an object with defaultParameterValue and parameterValue

await obs.addListener('RecordStateChanged', (data) => {
  console.log(data);
});

// The state of the record output has changed.

//     Complexity Rating: 2/5
//     Latest Supported RPC Version: 1
//     Added in v5.0.0

// Data Fields:
// Name 	Type 	Description
// outputActive 	Boolean 	Whether the output is active
// outputState 	String 	The specific state of the output
// outputPath 	String 	File name for the saved recording, if record stopped. null otherwise')
