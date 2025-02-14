const fs = require('fs');
const path = require('path');

const processFiles = async (folderPath, options) => {
  let { index: counter, targetObjects, replacementObject, labelsFile } = options;
  let labelsMap = {};

  if (labelsFile) {
    try {
      const labelsContent = fs.readFileSync(labelsFile, 'utf8').trim().split('\n');
      labelsContent.forEach((label, idx) => {
        labelsMap[label] = idx.toString();
      });
    } catch (err) {
      console.error(`Error reading labels file: ${err.message}`);
      process.exit(1);
    }
  }

  const imagesDir = path.join(folderPath, 'images');
  const labelsDir = path.join(folderPath, 'labels');
  const validateDir = path.join(folderPath, 'validate');

  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
  if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir);
  if (!fs.existsSync(validateDir)) fs.mkdirSync(validateDir);

  const files = fs.readdirSync(folderPath).filter(file => file !== 'images' && file !== 'labels' && file !== 'validate');

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);
    const parts = baseName.split('.');
    const label = parts.slice(0, 2).join('.');

    if (ext === '.txt') {
      const matchingTxt = `${baseName}.txt`;
      const matchingImage = `${baseName}.jpg`;
      const matchingImagePath = path.join(folderPath, matchingImage);
      if (!fs.existsSync(matchingImagePath)) continue;

      const txtPath = path.join(folderPath, file);
      const content = fs.readFileSync(txtPath, 'utf8').trim();
      const lines = content.split('\n');
      let newLines = [];

      for (const line of lines) {
        let object = line.split(' ');
        
        if (targetObjects === null || targetObjects.includes(object[0])) {
          if (labelsFile && labelsMap[label] !== undefined) {
            object[0] = labelsMap[label];
          } else if (replacementObject !== null) {
            object[0] = replacementObject;
          }

          newLines.push(object.join(' '));
        }
      }

      if (newLines.length === 0 && lines.length > 0) {
        fs.renameSync(txtPath, path.join(validateDir, matchingTxt));
        fs.renameSync(matchingImagePath, path.join(validateDir, matchingImage));
        continue;
      }

      const newBaseName = parts.slice(0, -1).join('.') + `.${String(counter).padStart(5, '0')}`;
      const newTxtName = `${newBaseName}.txt`;
      fs.writeFileSync(path.join(labelsDir, newTxtName), newLines.join('\n'));
      fs.unlinkSync(txtPath);

      const newImageName = `${newBaseName}.jpg`;
      fs.renameSync(matchingImagePath, path.join(imagesDir, newImageName));

      counter++;
    }
  }

  console.log('The files have been processed');
};

const args = process.argv.slice(2);
let folderPath = null;
let targetObjects = null;
let replacementObject = null;
let index = 0;
let labelsFile = null;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-o':
      if (args[i + 1]) {
        targetObjects = args[i + 1].split(',');
        i++;
      } else {
        console.error('Error: Missing value for -o');
        process.exit(1);
      }
      break;
    case '-r':
      if (args[i + 1]) {
        replacementObject = args[i + 1];
        i++;
      } else {
        console.error('Error: Missing value for -r');
        process.exit(1);
      }
      break;
    case '-i':
      if (args[i + 1]) {
        index = parseInt(args[i + 1], 10);
        i++;
      } else {
        console.error('Error: Missing value for -i');
        process.exit(1);
      }
      break;
    case '-l':
      if (args[i + 1]) {
        labelsFile = args[i + 1];
        i++;
      } else {
        console.error('Error: Missing value for -l');
        process.exit(1);
      }
      break;
    default:
      if (!folderPath) {
        folderPath = args[i];
      } else {
        console.error(`Error: Unexpected argument '${args[i]}'`);
        process.exit(1);
      }
      break;
  }
}

if (!folderPath) {
  console.error('Usage: node yotils /dir_path [-o targetObjects] [-r replacementObject] [-i index] [-l labelsFile]');
  process.exit(1);
}

processFiles(folderPath, { targetObjects, replacementObject, index, labelsFile });
