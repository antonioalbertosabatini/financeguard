package app.financeguard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.financeguard.quickadd.QuickAddPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(QuickAddPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
