package com.edua.beeduasystem.service.ai;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.service.lessonplan.LessonPlan5512PromptBuilder;
import com.edua.beeduasystem.service.lessonplan.LessonPlanEditPromptBuilder;
import com.edua.beeduasystem.service.molecule.MoleculePromptBuilder;
import com.edua.beeduasystem.service.physicssimulation.PhysicsSimulationPromptBuilder;
import com.edua.beeduasystem.service.slidedesign.SlideDesignPromptBuilder;
import com.edua.beeduasystem.service.slides.SlidePromptBuilder;
import org.springframework.stereotype.Component;

@Component
public class AiPromptTemplateCatalog {

    public String defaultInstruction(AiPromptKey key) {
        return switch (key) {
            case LESSON_PLAN_OBJECTIVES,
                 LESSON_PLAN_MATERIALS,
                 LESSON_PLAN_ACTIVITIES_FRAME,
                 LESSON_PLAN_ACTIVITY_DETAIL,
                 LESSON_PLAN_SUB_ACTIVITY_DETAIL -> LessonPlan5512PromptBuilder.defaultInstruction(key);
            case LESSON_PLAN_EDIT_SECTION_SELECT -> LessonPlanEditPromptBuilder.defaultSelectInstruction();
            case LESSON_PLAN_EDIT_SECTION -> LessonPlanEditPromptBuilder.defaultInstruction();
            case SLIDE_OUTLINE_DECK_BLUEPRINT,
                 SLIDE_OUTLINE_CONTENT_MAP,
                 SLIDE_OUTLINE_STRUCTURE,
                 SLIDE_OUTLINE_MERGED,
                 SLIDE_OUTLINE_PART_SKELETON,
                 SLIDE_OUTLINE_EXPAND_PART,
                 SLIDE_OUTLINE_CONSOLIDATE -> SlidePromptBuilder.defaultInstruction(key);
            case SLIDE_DESIGN_BACKGROUND,
                 SLIDE_DESIGN_STRUCTURE,
                 SLIDE_DESIGN_CONTENT_FILL,
                 SLIDE_DESIGN_CONTENT_SLOTS -> SlideDesignPromptBuilder.defaultInstruction(key);
            case MOLECULE_STRUCTURE -> MoleculePromptBuilder.defaultInstruction();
            case PHYSICS_SIMULATION_EDIT -> PhysicsSimulationPromptBuilder.defaultInstruction();
        };
    }

    public String replaceableInstructionPrefix(AiPromptKey key) {
        return switch (key) {
            case LESSON_PLAN_ACTIVITY_DETAIL -> LessonPlan5512PromptBuilder.activityDetailBaseInstruction();
            case LESSON_PLAN_SUB_ACTIVITY_DETAIL -> LessonPlan5512PromptBuilder.subActivityDetailBaseInstruction();
            default -> defaultInstruction(key);
        };
    }
}
