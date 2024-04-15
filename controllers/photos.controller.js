const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) { // if fields are not empty...

      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      const fileName = file.path.split('/').slice(-1)[0]; // get only filename from full path
      const fileExt = fileName.split('.').slice(-1)[0].toLowerCase(); // get file extension and convert to lowercase

      if (allowedExtensions.includes(fileExt)) { // check if file extension is allowed
        // Escape HTML characters in title, author, and email fields
        const escapedTitle = escapeHTML(title);
        const escapedAuthor = escapeHTML(author);
        const escapedEmail = escapeHTML(email);

        const newPhoto = new Photo({ title: escapedTitle, author: escapedAuthor, email: escapedEmail, src: fileName, votes: 0 });
        await newPhoto.save(); // save new photo in DB
        res.json(newPhoto);
      } else {
        // If file extension is not allowed, respond with error
        throw new Error('Wrong file format! Allowed formats: jpg, jpeg, png, gif');
      }

    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const ipAddress = req.ip; // Pobranie adresu IP użytkownika
    const photoId = req.params.id; // Identyfikator polubionego zdjęcia

    // Sprawdzenie czy użytkownik już głosował
    const existingVoter = await Voter.findOne({ user: ipAddress });

    if (!existingVoter) {
      // Jeśli użytkownik nie głosował, dodaj go do bazy i dodaj głos
      const newVoter = new Voter({ user: ipAddress, votes: [photoId] });
      await newVoter.save();

      // Zwiększenie ilości głosów dla danego zdjęcia
      const photoToUpdate = await Photo.findOne({ _id: photoId });
      if (!photoToUpdate) throw new Error('Photo not found');
      
      photoToUpdate.votes++;
      await photoToUpdate.save();

      res.json({ message: 'Vote counted successfully!' });
    } else {
      // Jeśli użytkownik już głosował, sprawdź czy głosował na dane zdjęcie
      if (existingVoter.votes.includes(photoId)) {
        res.status(500).json({ error: 'You have already voted for this photo!' });
      } else {
        // Jeśli nie głosował na dane zdjęcie, dodaj głos
        existingVoter.votes.push(photoId);
        await existingVoter.save();

        // Zwiększenie ilości głosów dla danego zdjęcia
        const photoToUpdate = await Photo.findOne({ _id: photoId });
        if (!photoToUpdate) throw new Error('Photo not found');
        
        photoToUpdate.votes++;
        await photoToUpdate.save();

        res.json({ message: 'Vote counted successfully!' });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Function to escape HTML characters
function escapeHTML(html) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}