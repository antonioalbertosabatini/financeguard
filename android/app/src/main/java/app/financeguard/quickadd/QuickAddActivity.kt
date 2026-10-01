package app.financeguard.quickadd

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import app.financeguard.MainActivity
import app.financeguard.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class QuickAddActivity : AppCompatActivity() {
    private var catalog: QuickAddCatalog? = null
    private lateinit var loc: Context

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        loc = this
        setContentView(R.layout.quick_add_activity)

        if (!QuickAddStore.isEnabled(this)) {
            showMessage(
                getString(R.string.quick_add_disabled_title),
                getString(R.string.quick_add_disabled_body)
            )
            return
        }

        if (!QuickAddAuth.canAuthenticate(this)) {
            showMessage(
                getString(R.string.quick_add_auth_failed),
                getString(R.string.quick_add_auth_subtitle)
            )
            return
        }

        QuickAddAuth.authenticate(this) { ok, _ ->
            if (!ok) {
                Toast.makeText(this, R.string.quick_add_auth_failed, Toast.LENGTH_SHORT).show()
                finish()
                return@authenticate
            }
            try {
                catalog = QuickAddStore.readCatalog(this)
            } catch (_: Exception) {
                catalog = null
            }
            val loaded = catalog
            if (loaded == null || loaded.accounts.isEmpty() || loaded.categories.isEmpty()) {
                applyLanguage(loaded?.language ?: "it")
                showMessage(
                    loc.getString(R.string.quick_add_empty_title),
                    loc.getString(R.string.quick_add_empty_body)
                )
                return@authenticate
            }
            applyLanguage(loaded.language)
            showForm(loaded)
        }
    }

    private fun applyLanguage(language: String) {
        val locale = if (language == "en") Locale.ENGLISH else Locale.ITALIAN
        val config = Configuration(resources.configuration)
        config.setLocale(locale)
        loc = createConfigurationContext(config)
    }

    private fun showMessage(title: String, body: String) {
        findViewById<LinearLayout>(R.id.quick_add_form).visibility = View.GONE
        val container = findViewById<LinearLayout>(R.id.quick_add_message_container)
        container.visibility = View.VISIBLE
        findViewById<TextView>(R.id.quick_add_title).text =
            loc.getString(R.string.quick_add_title)
        findViewById<TextView>(R.id.quick_add_message_title).text = title
        findViewById<TextView>(R.id.quick_add_message_body).text = body
        val open = findViewById<Button>(R.id.quick_add_open_app)
        open.text = loc.getString(R.string.quick_add_open_app)
        open.setOnClickListener {
            startActivity(
                Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
            )
            finish()
        }
    }

    private fun showForm(catalog: QuickAddCatalog) {
        findViewById<LinearLayout>(R.id.quick_add_message_container).visibility = View.GONE
        val form = findViewById<LinearLayout>(R.id.quick_add_form)
        form.visibility = View.VISIBLE

        findViewById<TextView>(R.id.quick_add_title).text =
            loc.getString(R.string.quick_add_title)
        findViewById<TextView>(R.id.quick_add_amount_label).text =
            loc.getString(R.string.quick_add_amount)
        findViewById<TextView>(R.id.quick_add_category_label).text =
            loc.getString(R.string.quick_add_category)
        findViewById<TextView>(R.id.quick_add_account_label).text =
            loc.getString(R.string.quick_add_account)
        findViewById<android.widget.RadioButton>(R.id.quick_add_type_expense).text =
            loc.getString(R.string.quick_add_type_expense)
        findViewById<android.widget.RadioButton>(R.id.quick_add_type_income).text =
            loc.getString(R.string.quick_add_type_income)
        findViewById<Button>(R.id.quick_add_save).text =
            loc.getString(R.string.quick_add_save)
        findViewById<Button>(R.id.quick_add_cancel).text =
            loc.getString(R.string.quick_add_cancel)

        val typeGroup = findViewById<RadioGroup>(R.id.quick_add_type)
        val categorySpinner = findViewById<Spinner>(R.id.quick_add_category)
        val accountSpinner = findViewById<Spinner>(R.id.quick_add_account)
        val amountInput = findViewById<EditText>(R.id.quick_add_amount)

        bindAccounts(accountSpinner, catalog)
        bindCategories(categorySpinner, catalog, currentType(typeGroup))

        typeGroup.setOnCheckedChangeListener { _, _ ->
            bindCategories(categorySpinner, catalog, currentType(typeGroup))
        }

        findViewById<Button>(R.id.quick_add_cancel).setOnClickListener { finish() }
        findViewById<Button>(R.id.quick_add_save).setOnClickListener {
            save(catalog, typeGroup, categorySpinner, accountSpinner, amountInput)
        }
    }

    private fun currentType(group: RadioGroup): String =
        if (group.checkedRadioButtonId == R.id.quick_add_type_income) "income" else "expense"

    private fun bindAccounts(spinner: Spinner, catalog: QuickAddCatalog) {
        val names = catalog.accounts.map { it.name }
        spinner.adapter = ArrayAdapter(
            loc,
            android.R.layout.simple_spinner_dropdown_item,
            names
        )
        val index = catalog.accounts.indexOfFirst { it.id == catalog.defaultAccountId }
        if (index >= 0) spinner.setSelection(index)
    }

    private fun bindCategories(spinner: Spinner, catalog: QuickAddCatalog, type: String) {
        val filtered = catalog.categories.filter { it.type == type }
        spinner.adapter = ArrayAdapter(
            loc,
            android.R.layout.simple_spinner_dropdown_item,
            filtered.map { it.name }
        )
        val defaultId =
            if (type == "income") catalog.defaultIncomeCategoryId else catalog.defaultExpenseCategoryId
        val index = filtered.indexOfFirst { it.id == defaultId }
        if (index >= 0) spinner.setSelection(index)
        spinner.tag = filtered
    }

    private fun save(
        catalog: QuickAddCatalog,
        typeGroup: RadioGroup,
        categorySpinner: Spinner,
        accountSpinner: Spinner,
        amountInput: EditText
    ) {
        val cents = parseCents(amountInput.text?.toString().orEmpty())
        if (cents <= 0) {
            Toast.makeText(this, loc.getString(R.string.quick_add_invalid_amount), Toast.LENGTH_SHORT).show()
            return
        }
        val type = currentType(typeGroup)
        @Suppress("UNCHECKED_CAST")
        val categories = categorySpinner.tag as? List<CatalogCategory> ?: emptyList()
        val category = categories.getOrNull(categorySpinner.selectedItemPosition)
        val account = catalog.accounts.getOrNull(accountSpinner.selectedItemPosition)
        if (category == null || account == null) {
            Toast.makeText(this, loc.getString(R.string.quick_add_empty_body), Toast.LENGTH_SHORT).show()
            return
        }

        val item = PendingItem(
            id = QuickAddStore.newPendingId(),
            amount = cents,
            type = type,
            categoryId = category.id,
            accountId = account.id,
            date = todayIso()
        )
        try {
            QuickAddStore.appendPending(this, item)
            QuickAddStore.updateCatalogDefaults(this, account.id, type, category.id)
            Toast.makeText(this, loc.getString(R.string.quick_add_saved), Toast.LENGTH_LONG).show()
            finish()
        } catch (_: Exception) {
            QuickAddAuth.authenticate(this) { ok, _ ->
                if (!ok) {
                    Toast.makeText(this, loc.getString(R.string.quick_add_auth_failed), Toast.LENGTH_SHORT).show()
                    return@authenticate
                }
                try {
                    QuickAddStore.appendPending(this, item)
                    QuickAddStore.updateCatalogDefaults(this, account.id, type, category.id)
                    Toast.makeText(this, loc.getString(R.string.quick_add_saved), Toast.LENGTH_LONG).show()
                    finish()
                } catch (_: Exception) {
                    Toast.makeText(this, loc.getString(R.string.quick_add_error), Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun parseCents(raw: String): Int {
        val normalized = raw.replace(",", ".").trim()
        if (normalized.isEmpty()) return 0
        val value = normalized.toDoubleOrNull() ?: return 0
        if (value <= 0.0 || !value.isFinite()) return 0
        return Math.round(value * 100.0).toInt()
    }

    private fun todayIso(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
}
