import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Comprehensive Safety Test Suite Runner
 * Orchestrates golden scenarios, red-teaming, and compliance checks
 * 
 * Usage: Call via base44.functions.invoke('runSafetyTestSuite', { profiles: ['lenient', 'standard', 'strict'] })
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { 
      profiles = ['lenient', 'standard', 'strict'],
      include_redteaming = true,
      include_compliance = true
    } = await req.json();

    const suiteResults = {
      timestamp: new Date().toISOString(),
      profiles_tested: profiles,
      results: {
        golden_scenarios: {},
        red_teaming: null,
        compliance: null
      },
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        overall_status: 'pending'
      }
    };

    // Run golden scenarios for each profile
    for (const profile of profiles) {
      console.log(`[Test Suite] Running golden scenarios for ${profile} profile...`);
      
      try {
        const goldenResults = await base44.functions.invoke('safetyGoldenScenarios', {
          profile,
          run_mode: 'all'
        });

        suiteResults.results.golden_scenarios[profile] = goldenResults.data;
        suiteResults.summary.total_tests += goldenResults.data.total_scenarios;
        suiteResults.summary.passed += goldenResults.data.passed;
        suiteResults.summary.failed += goldenResults.data.failed;
      } catch (error) {
        console.error(`[Test Suite] Golden scenarios failed for ${profile}:`, error);
        suiteResults.results.golden_scenarios[profile] = { error: error.message };
      }
    }

    // Run red-teaming tests (profile-agnostic)
    if (include_redteaming) {
      console.log('[Test Suite] Running red-teaming tests...');
      
      try {
        const redTeamResults = await base44.functions.invoke('redTeamingTests', {
          mode: 'adversarial',
          test_count: 25
        });

        suiteResults.results.red_teaming = redTeamResults.data;
        suiteResults.summary.total_tests += redTeamResults.data.total_tests;
        suiteResults.summary.passed += redTeamResults.data.detected;
        suiteResults.summary.failed += redTeamResults.data.bypassed + redTeamResults.data.false_positives;
      } catch (error) {
        console.error('[Test Suite] Red-teaming failed:', error);
        suiteResults.results.red_teaming = { error: error.message };
      }
    }

    // Generate compliance report
    if (include_compliance) {
      console.log('[Test Suite] Generating compliance report...');
      
      try {
        const complianceResults = await base44.functions.invoke('generateComplianceReport', {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          report_type: 'summary'
        });

        suiteResults.results.compliance = complianceResults.data;
      } catch (error) {
        console.error('[Test Suite] Compliance report failed:', error);
        suiteResults.results.compliance = { error: error.message };
      }
    }

    // Calculate overall status
    const successRate = (suiteResults.summary.passed / suiteResults.summary.total_tests) * 100;
    suiteResults.summary.success_rate = successRate.toFixed(1) + '%';
    suiteResults.summary.overall_status = successRate >= 95 ? 'PASS' : successRate >= 85 ? 'NEEDS_REVIEW' : 'FAIL';

    // Generate recommendations
    suiteResults.recommendations = [];
    
    if (successRate < 85) {
      suiteResults.recommendations.push({
        priority: 'high',
        category: 'overall',
        message: `Low success rate (${successRate.toFixed(1)}%). Immediate review required.`
      });
    }

    // Profile-specific recommendations
    for (const [profile, results] of Object.entries(suiteResults.results.golden_scenarios)) {
      if (results.failed > 0) {
        const failedScenarios = results.scenarios?.filter(s => s.status === 'failed') || [];
        suiteResults.recommendations.push({
          priority: 'medium',
          category: profile,
          message: `${profile} profile: ${results.failed} scenario(s) failed`,
          details: failedScenarios.map(s => `${s.id}: ${s.failures?.join(', ')}`).slice(0, 3)
        });
      }
    }

    // Red-teaming recommendations
    if (suiteResults.results.red_teaming?.bypassed > 0) {
      suiteResults.recommendations.push({
        priority: 'high',
        category: 'red_teaming',
        message: `${suiteResults.results.red_teaming.bypassed} bypass(es) detected. Strengthen detection patterns.`
      });
    }

    // Compliance recommendations
    if (suiteResults.results.compliance?.alerts?.length > 0) {
      suiteResults.recommendations.push({
        priority: 'medium',
        category: 'compliance',
        message: `${suiteResults.results.compliance.alerts.length} compliance alert(s) detected`,
        details: suiteResults.results.compliance.alerts.map(a => a.message)
      });
    }

    return Response.json(suiteResults);

  } catch (error) {
    console.error('[Test Suite] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});