import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import S3 from 'aws-sdk/clients/s3';
import DynamoDB from 'aws-sdk/clients/dynamodb';

import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [timer, setTimer] = useState(null);

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    // Add more supported types as needed
  ];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (allowedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setFileName(selectedFile.name); // Set the file name when a file is selected
    } else {
      alert('Invalid file type. Only images and PDFs are allowed.');
    }
  };

  const uploadFile = async () => {
    setUploading(true);
    const S3_BUCKET = "aws-us-west-2-058264244501-savetolamda-pipe";
    const REGION = "us-west-2";

    AWS.config.update({
      accessKeyId: "",
      secretAccessKey: "",
    });

    const s3 = new S3({
      params: { Bucket: S3_BUCKET },
      region: REGION,
    });

    const params = {
      Bucket: S3_BUCKET,
      Key: file.name,
      Body: file,
    };

    try {
      const upload = await s3.putObject(params).promise();
      console.log(upload);
      setUploading(false);
      alert("File uploaded successfully.");

      // Start the timer after successful upload
      setTimer(10);
    } catch (error) {
      console.error(error);
      setUploading(false);
      alert("Error uploading file: " + error.message);
    }
  };

  const queryDynamoDB = async () => {
    const DYNAMODB_TABLE = "ImageTextDetections";
    const REGION = "us-west-2";

    AWS.config.update({
      accessKeyId: "",
      secretAccessKey: "",
      region: REGION
    });

    const dynamodb = new DynamoDB.DocumentClient();

    const params = {
      TableName: DYNAMODB_TABLE,
      // No KeyConditionExpression needed
      ScanIndexForward: false,
      Limit: 1
    };

    try {
      const data = await dynamodb.scan(params).promise();
      if (data.Items && data.Items.length > 0) {
        setQueryResult(data.Items[0]);
        console.log("Latest DynamoDB item:", data.Items[0]);
      } else {
        setQueryResult(null);
        console.log("No items found in DynamoDB");
      }
    } catch (error) {
      console.error("Error querying DynamoDB:", error);
      setQueryResult(null);
    }
  };

  // useEffect for the timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0) {
      // Automatically query DynamoDB when the timer reaches 0
      queryDynamoDB();
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [timer]);

  return (
    <div className="container">
      <h1>Text Recocgnition</h1>

      <div className="upload-section">
        <label htmlFor="file-input" className="upload-button">
          Choose File
        </label>
        <input type="file" id="file-input" required onChange={handleFileChange} />
        {fileName && <p>Selected file: {fileName}</p>} {/* Display the file name */}
        <button className="upload-button" onClick={uploadFile} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>

      {timer > 0 && (
        <div className="timer">
          <p>Detected texts will appear in: <span className="countdown">{timer}</span> seconds</p>
        </div>
      )}

      {/* <button className="query-button" onClick={queryDynamoDB} disabled={timer > 0}>
        Query DynamoDB
      </button> */}

      {queryResult && (
        <div className="result-section">
          <h2>DynamoDB Query Result:</h2>
          <pre>{JSON.stringify(queryResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
export default App;