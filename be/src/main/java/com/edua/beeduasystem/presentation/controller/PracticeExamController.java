package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.domain.model.practiceexam.PracticeExamValidation;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.service.practiceexam.PracticeExamService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/practice-exams")
public class PracticeExamController {
    private final PracticeExamService practiceExamService;
    public PracticeExamController(PracticeExamService practiceExamService) { this.practiceExamService = practiceExamService; }
    @PostMapping("/validate-configuration") public PracticeExamValidation validate(@RequestBody PracticeExamRequest request) { return practiceExamService.validate(request); }
    @PostMapping("/generate") public PracticeExam generate(@RequestBody PracticeExamRequest request) { return practiceExamService.generate(request); }
}
