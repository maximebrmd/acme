# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WorkspaceMember < Internal::Types::Model
      field :email, -> { String }, optional: false, nullable: false

      field :joined_at, -> { String }, optional: false, nullable: false, api_name: "joinedAt"

      field :name, -> { String }, optional: false, nullable: false

      field :role, -> { String }, optional: false, nullable: false

      field :two_step_enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "twoStepEnabled"

      field :user_id, -> { String }, optional: false, nullable: false, api_name: "userId"
    end
  end
end
