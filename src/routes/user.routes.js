import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refreshToken").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT , changeCurrentPassword)

router.route("/get-current-user").get(verifyJWT , getCurrentUser)

router.route("/update-user").patch(verifyJWT , updateAccountDetails)

router.route("/update-avatar").patch(
    upload.fields(
        [
            {
                name: "avatar",
                maxCount: 1
            }
        ]
    ), verifyJWT , updateUserAvatar
    )

router.route("/update-coverImage").patch(
    upload.fields(
        [
            {
                name: "coverImage",
                maxCount: 1
            }
        ]
    ), verifyJWT , updateUserCoverImage
)



export default router;
