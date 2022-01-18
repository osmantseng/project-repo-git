/**
 * Classes for common error types
 */

 /**
  * User cancelled an operation. Typically for this error, we don't have to
  * report it to the user.
  */
export class UserCancellation extends Error {
    constructor()
    {
        super();
    }
};
