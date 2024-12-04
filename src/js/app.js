$(function () {
    var $subtitleInput1 = $("#subtitle-input-1");
    var $subtitleInput2 = $("#subtitle-input-2");
    var $videoInput1 = $("#video-input-1");
    var $videoInput2 = $("#video-input-2");
    var $refPointInputs = $subtitleInput1.add($subtitleInput2).add($videoInput1).add($videoInput2);

    var $offsetInput = $("#offset-input");
    var $factorInput = $("#factor-input");

    function toDisplayTime(value) {
        return (value >= 0 ? '' : '-') + Subtitle.toSrtTime(Math.abs(value)).replace(',', '.');
    }

    function fromDisplayTime(value, allowNegative) {
        var sign = value.substr(0, 1);
        switch (sign) {
            case '+':
            case '-':
                sign = sign == '+' ? 1 : -1;
                value = value.substr(1);
                break;
            default:
                sign = 1;
                break;
        }

        if (!allowNegative && sign < 0)
            throw new Error("Negative values are not allowed.");

        return sign * Subtitle.toMS(value);
    }

    function update(offset, factor) {
        $offsetInput.prop('parsedValue', offset).val(toDisplayTime(offset));
        $factorInput.prop('parsedValue', factor).val(factor);
    }

    $refPointInputs.prop('parsedValue', 0).val(toDisplayTime(0));
    update(0, 1);

    $refPointInputs.on('change', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $target = $(e.target);

        try { $target.prop('parsedValue', fromDisplayTime($target.val())); }
        catch (err) { }

        $target.val(toDisplayTime($target.prop('parsedValue')));
        $refPointInputs.parent().removeClass('has-error');

        var s1 = $subtitleInput1.prop('parsedValue');
        var s2 = $subtitleInput2.prop('parsedValue');
        var v1 = $videoInput1.prop('parsedValue');
        var v2 = $videoInput2.prop('parsedValue');

        if (s1 != 0 || s2 != 0 || v1 != 0 || v2 != 0) {
            var ds = s2 - s1;
            var dv = v2 - v1;
            if (ds > 0 && dv > 0) {
                var factor = dv / ds;
                var offset = Math.round(factor * -s1 + v1);
                update(offset, factor);
            }
            else if (ds <= 0 && $target.attr('id').indexOf('subtitle') == 0 ||
                dv <= 0 && $target.attr('id').indexOf('video') == 0)
                $target.parent().addClass('has-error');
        }
        else
            update(0, 1);
    });

    $offsetInput.on('change', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $target = $(e.target);

        try { $target.prop('parsedValue', fromDisplayTime($target.val(), true)); }
        catch (err) { }

        $target.val(toDisplayTime($target.prop('parsedValue')));
    });

    $factorInput.on('change', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $target = $(e.target);

        var value = new Number($target.val());
        if (!isNaN(value))
            $target.prop('parsedValue', value);

        $target.val(value);
    });

    var $inputText = $('#input-text');
    var $outputText = $('#output-text');

    var $adjustButton = $('#adjust-button');
    var $downloadButton = $('#download-button');

    $adjustButton.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $downloadButton.attr('disabled', true);

        var input = $inputText.val();
        if (!input) {
            $outputText.val('');
            return;
        }

        try { var subtitle = Subtitle.parse(input); }
        catch (err) {
            $outputText.val("Input text doesn't seem to have a valid SRT format.");
            console.log(err);
            return;
        }

        var offset = $offsetInput.prop('parsedValue');
        var factor = $factorInput.prop('parsedValue');

        function adjust(value) {
            return Math.round(factor * value + offset);
        }

        for (var i = 0; i < subtitle.length; i++) {
            var entry = subtitle[i];
            entry.start = adjust(entry.start);
            entry.end = adjust(entry.end);
        }

        $outputText.val(Subtitle.stringify(subtitle));
        $downloadButton.removeAttr('disabled');
    });

    $downloadButton.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var output = $outputText.val();

        var a = document.createElement("a");
        var file = new Blob(["\ufeff", output], { type: "text/plain" });

        a.href = URL.createObjectURL(file);
        try {
            var fileName = $inputText.prop('fileName') || 'subtitle.srt';
            parts = fileName.split('.');
            parts.splice(parts.length - 1, 0, 'fixed');
            fileName = parts.join('.');
            a.download = fileName;
            a.classList.add('hidden');

            document.body.appendChild(a);
            try { a.click(); }
            finally { document.body.removeChild(a); }
        }
        finally { URL.revokeObjectURL(a.href); }
    });

    // https://www.html5rocks.com/en/tutorials/file/dndfiles/
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        $inputText.on('dragover', function (e) {
            e.stopPropagation();
            e.preventDefault();
            e = e.originalEvent;
            e.dataTransfer.dropEffect = 'copy';
        });

        $inputText.on('drop', function (e) {
            e.stopPropagation();
            e.preventDefault();
            e = e.originalEvent;

            var files = e.dataTransfer.files;
            if (!files.length)
                return;

            var reader = new FileReader();
            reader.onload = function (e) {
                $inputText.prop('fileName', files[0].name);
                $inputText.val(e.target.result);
            };
            reader.readAsText(files[0]);
        });

        $inputText.on('change', function (e) {
            e.stopPropagation();
            e.preventDefault();

            $inputText.prop('fileName', null);
        });
    }
})