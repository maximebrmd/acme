# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ActivityActorUser < Internal::Types::Model
      field :user_id, -> { String }, optional: false, nullable: true, api_name: "userId"
    end
  end
end
