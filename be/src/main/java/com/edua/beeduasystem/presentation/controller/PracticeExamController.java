package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.domain.model.practiceexam.PracticeExamValidation;
import com.edua.beeduasystem.presentation.dto.practiceexam.GeneratePracticeExamStreamRequest;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.presentation.dto.practiceexam.RegenerateQuestionRequest;
import com.edua.beeduasystem.service.practiceexam.GeneratePracticeExamStreamUseCase;
import com.edua.beeduasystem.service.practiceexam.PracticeExamService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/practice-exams")
@PreAuthorize("hasAnyRole('TEACHER', 'MODERATOR')")
public class PracticeExamController {
    private final PracticeExamService practiceExamService;
    private final GeneratePracticeExamStreamUseCase generatePracticeExamStreamUseCase;
    public PracticeExamController(PracticeExamService practiceExamService,
                                  GeneratePracticeExamStreamUseCase generatePracticeExamStreamUseCase) {
        this.practiceExamService = practiceExamService;
        this.generatePracticeExamStreamUseCase = generatePracticeExamStreamUseCase;
    }
    @PostMapping("/validate-configuration") public PracticeExamValidation validate(@RequestBody PracticeExamRequest request) { return practiceExamService.validate(request); }
    @PostMapping("/generate") public PracticeExam generate(@RequestBody PracticeExamRequest request) { return practiceExamService.generate(request); }

    @PostMapping("/generate-stream")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void generateStream(@RequestBody GeneratePracticeExamStreamRequest request) {
        generatePracticeExamStreamUseCase.start(request);
    }

    @PostMapping("/regenerate-question")
    public PracticeExam.Question regenerateQuestion(@RequestBody RegenerateQuestionRequest request) {
        return practiceExamService.regenerateQuestion(request.request(), request.order(), request.type(), request.scoreCentiPoints());
    }
}
