# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostTimingNow < Internal::Types::Model
      field :time_zone, -> { String }, optional: true, nullable: false, api_name: "timeZone"
    end
  end
end
