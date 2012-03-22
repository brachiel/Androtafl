package ch.chrummibei.androtafl;


import android.os.Bundle;
import org.apache.cordova.*;

public class AndrotaflActivity extends DroidGap {
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        //setContentView(R.layout.main);
        super.loadUrl("file:///android_asset/www/index.html");
    }
}