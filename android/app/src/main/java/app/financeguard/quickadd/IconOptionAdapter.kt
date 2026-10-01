package app.financeguard.quickadd

import android.content.Context
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ImageView
import android.widget.Spinner
import android.widget.TextView
import androidx.annotation.ColorInt
import androidx.annotation.DrawableRes
import androidx.core.widget.ImageViewCompat
import app.financeguard.R

internal data class IconOption(
    val id: String,
    val name: String,
    @DrawableRes val iconRes: Int,
    @ColorInt val tint: Int
)

/** Spinner adapter styled like the web Select: icon + label, check on the selected row. */
internal class IconOptionAdapter(
    context: Context,
    private val spinner: Spinner,
    private val options: List<IconOption>
) : ArrayAdapter<IconOption>(context, R.layout.quick_add_option_item, options) {
    private val inflater = LayoutInflater.from(context)

    override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
        bind(convertView ?: inflater.inflate(R.layout.quick_add_option_item, parent, false), position)

    override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = bind(
            convertView ?: inflater.inflate(R.layout.quick_add_option_dropdown_item, parent, false),
            position
        )
        view.findViewById<ImageView>(R.id.quick_add_option_check).visibility =
            if (position == spinner.selectedItemPosition) View.VISIBLE else View.INVISIBLE
        return view
    }

    private fun bind(view: View, position: Int): View {
        val option = options[position]
        view.findViewById<TextView>(R.id.quick_add_option_text).text = option.name
        val icon = view.findViewById<ImageView>(R.id.quick_add_option_icon)
        icon.setImageResource(option.iconRes)
        ImageViewCompat.setImageTintList(icon, ColorStateList.valueOf(option.tint))
        return view
    }
}
