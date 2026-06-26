package com.edua.beeduasystem.domain.model.slide;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = SlideElement.Text.class, name = "text"),
        @JsonSubTypes.Type(value = SlideElement.Image.class, name = "image"),
        @JsonSubTypes.Type(value = SlideElement.Shape.class, name = "shape"),
        @JsonSubTypes.Type(value = SlideElement.Embed.class, name = "embed"),
        @JsonSubTypes.Type(value = SlideElement.Latex.class, name = "latex"),
})
public sealed interface SlideElement {

    String id();
    double x();
    double y();
    double width();
    double height();
    Double rotation();
    int zIndex();
    Boolean locked();

    record Text(
            String id,
            double x, double y, double width, double height,
            Double rotation, int zIndex, Boolean locked,
            String html,
            Integer fontSize,
            String color,
            String align
    ) implements SlideElement {}

    record Image(
            String id,
            double x, double y, double width, double height,
            Double rotation, int zIndex, Boolean locked,
            String src,
            String alt,
            String fit,
            String imagePrompt
    ) implements SlideElement {}

    record Shape(
            String id,
            double x, double y, double width, double height,
            Double rotation, int zIndex, Boolean locked,
            String shape,
            String fill,
            String stroke,
            Double strokeWidth,
            Double borderRadius
    ) implements SlideElement {}

    record Embed(
            String id,
            double x, double y, double width, double height,
            Double rotation, int zIndex, Boolean locked,
            String srcdoc,
            java.util.UUID experimentId
    ) implements SlideElement {}

    record Latex(
            String id,
            double x, double y, double width, double height,
            Double rotation, int zIndex, Boolean locked,
            String tex
    ) implements SlideElement {}
}
