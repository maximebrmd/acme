# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventRecyclingEnded < Internal::Types::Model
      field :reason, -> { Peal::Types::RecyclingNoticeReason }, optional: false, nullable: false

      field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"

      field :source_post_id, -> { String }, optional: false, nullable: false, api_name: "sourcePostId"
    end
  end
end
