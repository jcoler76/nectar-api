const path = require('path');
const fs = require('fs').promises;
const StorageProviderFactory = require('../services/storage/StorageProviderFactory');

async function testLocalStorageProvider() {
  console.log('🧪 Testing Local Storage Provider...');

  const config = {
    basePath: path.join(__dirname, 'test_storage'),
    encryptionEnabled: true,
    encryptionKey: 'test-encryption-key-32-chars-long',
  };

  try {
    console.log('✅ Creating Local storage provider...');
    const provider = StorageProviderFactory.createProvider('LOCAL', config);

    console.log('✅ Testing connection...');
    const connectionResult = await provider.testConnection();

    if (!connectionResult.success) {
      throw new Error(`Connection test failed: ${connectionResult.error}`);
    }

    console.log('✅ Uploading test file...');
    const testContent = Buffer.from('Hello, Local Storage!', 'utf8');
    const uploadResult = await provider.uploadFile(testContent, 'test/hello.txt', {
      originalName: 'hello.txt',
      contentType: 'text/plain',
      customMetadata: {
        testField: 'testValue',
      },
    });

    console.log('📦 Upload result:', uploadResult);

    console.log('✅ Downloading test file...');
    const downloadResult = await provider.downloadFile('test/hello.txt');
    const downloadedContent = downloadResult.buffer.toString('utf8');

    if (downloadedContent !== 'Hello, Local Storage!') {
      throw new Error(
        `Content mismatch: expected "Hello, Local Storage!", got "${downloadedContent}"`
      );
    }

    console.log('📥 Download successful, content matches');

    console.log('✅ Getting file metadata...');
    const metadata = await provider.getFileMetadata('test/hello.txt');
    console.log('📋 Metadata:', metadata);

    console.log('✅ Listing files...');
    const files = await provider.listFiles('test/', 10);
    console.log('📋 Files:', files);

    console.log('✅ Copying file...');
    await provider.copyFile('test/hello.txt', 'test/hello-copy.txt');

    console.log('✅ Generating presigned URL...');
    const presignedUrl = await provider.generatePresignedUrl('test/hello.txt', 'download', 3600);
    console.log('🔗 Presigned URL:', presignedUrl);

    console.log('✅ Deleting test files...');
    await provider.deleteFile('test/hello.txt');
    await provider.deleteFile('test/hello-copy.txt');

    console.log('🎉 Local storage provider test completed successfully!');

    // Clean up test directory
    try {
      await fs.rmdir(config.basePath, { recursive: true });
    } catch (err) {
      console.warn('⚠️  Could not clean up test directory:', err.message);
    }
  } catch (error) {
    console.error('❌ Local storage provider test failed:', error.message);
    throw error;
  }
}

async function testStorageProviderFactory() {
  console.log('🧪 Testing Storage Provider Factory...');

  try {
    console.log('✅ Getting supported provider types...');
    const supportedTypes = StorageProviderFactory.getSupportedTypes();
    console.log('📋 Supported types:', supportedTypes);

    console.log('✅ Getting provider type info...');
    const providerInfo = StorageProviderFactory.getProviderTypeInfo();
    console.log(
      '📋 Provider info:',
      providerInfo.map(p => `${p.name} (${p.type})`)
    );

    console.log('✅ Testing provider validation...');
    const s3Validation = StorageProviderFactory.getValidationRules('S3');
    console.log('📋 S3 validation rules:', Object.keys(s3Validation));

    console.log('✅ Creating multi-provider service...');
    const multiService = StorageProviderFactory.createMultiProviderService([
      {
        type: 'LOCAL',
        name: 'local-dev',
        config: {
          basePath: path.join(__dirname, 'test_multi_storage', 'local'),
        },
      },
      {
        type: 'LOCAL',
        name: 'local-backup',
        config: {
          basePath: path.join(__dirname, 'test_multi_storage', 'backup'),
        },
      },
    ]);

    console.log('📋 Multi-service provider names:', multiService.getProviderNames());

    console.log('✅ Testing multi-provider upload...');
    const testContent = Buffer.from('Multi-provider test!', 'utf8');

    await multiService.uploadFile('local-dev', testContent, 'multi-test.txt', {
      originalName: 'multi-test.txt',
      contentType: 'text/plain',
    });

    await multiService.uploadFile('local-backup', testContent, 'multi-test.txt', {
      originalName: 'multi-test.txt',
      contentType: 'text/plain',
    });

    console.log('✅ Testing multi-provider download...');
    const devResult = await multiService.downloadFile('local-dev', 'multi-test.txt');
    const backupResult = await multiService.downloadFile('local-backup', 'multi-test.txt');

    if (devResult.buffer.toString() !== backupResult.buffer.toString()) {
      throw new Error('Multi-provider content mismatch');
    }

    console.log('✅ Testing all providers...');
    const testResults = await multiService.testAllProviders();
    console.log('📋 Test results:', testResults);

    console.log('✅ Cleaning up...');
    await multiService.deleteFile('local-dev', 'multi-test.txt');
    await multiService.deleteFile('local-backup', 'multi-test.txt');

    console.log('🎉 Storage provider factory test completed successfully!');

    // Clean up test directories
    try {
      await fs.rmdir(path.join(__dirname, 'test_multi_storage'), { recursive: true });
    } catch (err) {
      console.warn('⚠️  Could not clean up test directory:', err.message);
    }
  } catch (error) {
    console.error('❌ Storage provider factory test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Storage Provider Tests...\n');

  try {
    await testLocalStorageProvider();
    console.log('');
    await testStorageProviderFactory();
    console.log('\n✅ All storage provider tests passed!');
  } catch (error) {
    console.error('\n❌ Storage provider tests failed!', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Tests failed!', error);
      process.exit(1);
    });
}

module.exports = {
  testLocalStorageProvider,
  testStorageProviderFactory,
  runAllTests,
};
