// controllers/locationController.js
const locationModel = require('../models/locationModel');

exports.showDirections = (req, res) => {
  res.render('location/location_come.html');
};

exports.showMap = (req, res) => {
  res.render('location/location.html');
};

/**
 * GET /poi
 * - 전체 POI 반환
 * - 선택: ?type=food|toilet 등 필터, ?q=키워드 검색
 */
exports.listPoi = async (req, res) => {
  try {
    const { type, q } = req.query || {};
    const rows = await locationModel.getPoiList({ type, q });
    res.json(rows);
  } catch (e) {
    console.error('[GET /poi]', e);
    // 항상 JSON을 반환하도록 변경: 클라이언트에서 JSON.parse 에러 방지
    res.status(500).json({ ok: false, error: 'DB 오류 발생' });
  }
};
