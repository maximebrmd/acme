# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventFollowUpRuleStopped < Internal::Types::Model
      field :reason, -> { Peal::Types::AutomationStopReason }, optional: false, nullable: false

      field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"
    end
  end
end
