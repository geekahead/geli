import {Request, Response} from 'express';
import {Body, Post, JsonController, Req, Res, HttpError, UseBefore, BodyParam} from 'routing-controllers';
import {json as bodyParserJson} from 'body-parser';
import passportLoginMiddleware from '../security/passportLoginMiddleware';
import emailService from '../services/EmailService';

import {IUser} from '../models/IUser';
import {IUserModel, User} from '../models/User';
import {JwtUtils} from '../security/JwtUtils';

@JsonController('/auth')
export class AuthController {

  @Post('/login')
  @UseBefore(bodyParserJson(), passportLoginMiddleware) // We need body-parser for passport to find the credentials
  postLogin(@Req() request: Request) {
    const user = <IUserModel>(<any>request).user;

    return {
      token: 'JWT ' + JwtUtils.generateToken(user),
      user: user.toObject()
    };
  }

  @Post('/register')
  postRegister(@Body() user: IUser, @Res() res: Response) {
    return User.findOne({email: user.email})
      .then((existingUser) => {
        // If user is not unique, return error
        if (existingUser) {
          throw new HttpError(422, 'That email address is already in use.');
        }

        return new User(user).save();
      })
      .then((savedUser) => {
        emailService.sendActivation(savedUser);
        return {
          token: 'JWT ' + JwtUtils.generateToken(savedUser),
          user: savedUser.toObject()
        };
      });
  }

  @Post('/activate')
  postActivation(@BodyParam('authenticationToken') authenticationToken: String) {
    return User.findOne({authenticationToken: authenticationToken})
      .then((existingUser) => {
        if (!existingUser) {
          throw new HttpError(422, 'could not activate user');
        }

        existingUser.authenticationToken = undefined;
        return existingUser.save();
      })
      .then((user) => {
        return {
          token: 'JWT ' + JwtUtils.generateToken(user),
          user: user.toObject()
        };
      });
  }
}