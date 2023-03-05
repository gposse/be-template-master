
const getProfile = async (req, res, next) => {
    const {Profile} = req.app.get('models')
    const profile = await Profile.findOne({where: {id: req.get('profile_id') || 0}})
    if (!profile) 
        return res.status(401).end();

    // Checks for data integrity in profile type
    if (profile.type!="client" && profile.type!="contractor")
        return res.status(401).end();

    req.profile = profile;
    console.log(profile);
    next()
}
module.exports = {getProfile}