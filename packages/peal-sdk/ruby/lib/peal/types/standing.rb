# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Standing < Internal::Types::Model
      field :account, -> { Peal::Types::BillingAccount }, optional: true, nullable: false

      field :grace_until, -> { String }, optional: false, nullable: true, api_name: "graceUntil"

      field :must_reduce, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "mustReduce"

      field :over, -> { Internal::Types::Array[Peal::Types::Excess] }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :plan_with_room, -> { Peal::Types::PaidPlan }, optional: false, nullable: true, api_name: "planWithRoom"

      field :scheduled_posts, -> { Integer }, optional: false, nullable: false, api_name: "scheduledPosts"
    end
  end
end
