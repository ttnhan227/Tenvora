import 'package:flutter/material.dart';
import 'package:google_sign_in_web/web_only.dart' as web;

Widget buildGoogleSignInButton({
  required BuildContext context,
  required bool busy,
  required VoidCallback onPressed,
}) {
  return IgnorePointer(
    ignoring: busy,
    child: SizedBox(
      height: 44,
      child: web.renderButton(
        configuration: web.GSIButtonConfiguration(
          text: web.GSIButtonText.continueWith,
          theme: Theme.of(context).brightness == Brightness.dark
              ? web.GSIButtonTheme.filledBlue
              : web.GSIButtonTheme.outline,
        ),
      ),
    ),
  );
}
