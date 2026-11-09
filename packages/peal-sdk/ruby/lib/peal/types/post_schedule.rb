# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostSchedule < Internal::Types::Model
      field :at, -> { String }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
    end
  end
end
