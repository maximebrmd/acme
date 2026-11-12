# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OverviewPosts < Internal::Types::Model
      field :awaiting_approval, -> { Integer }, optional: false, nullable: false, api_name: "awaitingApproval"

      field :failed_last7days, -> { Integer }, optional: false, nullable: false, api_name: "failedLast7Days"

      field :may_approve, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "mayApprove"

      field :scheduled_next7days, -> { Integer }, optional: false, nullable: false, api_name: "scheduledNext7Days"

      field :unconfirmed_last7days, -> { Integer }, optional: false, nullable: false, api_name: "unconfirmedLast7Days"
    end
  end
end
